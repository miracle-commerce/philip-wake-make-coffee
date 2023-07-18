window['Template_Password'] = () => {
  return {
    passwordInput: 'login',
    mounted() {
      initTeleport(this.$refs.modalContent);
      Alpine.store('modals').register('password', 'modal');
    },
  };
};
